import Struggle from './struggle';

const client = new Struggle({
    provider: 'sqlite',
    url: './sqlite.db'
});


const test = async () => {
    await client.init()
    // const testing = await client.select('name').where({ id: 1 }).from('demo').run().catch(e => console.log(e)); // wait but now its where id="1" eh whatever should be fine
    // console.log(testing)
    // await client.update('demo').set({ name: 'Just testing ;)' }).where({ id: 1 }).run();
    // await client.update('demo').set({ hint: 'go suck a dick lul' }).where({ id: 1 }).run()
    const res = await client.raw('SELECT * FROM demo').run().catch(e => console.log(e));
    // await client.insert({ name: 'shit', hint: 'motherfucker luuuuul' }).into('demo').run().catch(e => console.log(e)) ;
    console.log(res)
}

test() 