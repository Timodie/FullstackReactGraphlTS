
import {MikroORM} from "@mikro-orm/core"
import { Post } from "./entities/Post"
import microConfig from "./mikro-orm.config"

const main = async () => {
    const orm = await MikroORM.init(microConfig)
    await orm.getMigrator().up();
   const post =  orm.em.create(Post, { title: "my first posts"});
   await orm.em.persistAndFlush(post)
   const allPosts = await orm.em.find(Post, {});
   console.log(allPosts);
}

main().catch(err => {
    console.log("ERROR")
    console.log(err);
})